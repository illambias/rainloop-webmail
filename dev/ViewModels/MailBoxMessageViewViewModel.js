/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxMessageViewViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'MailMessageView');

	var
		sPic = '',
		oData = RL.data(),
		self = this,
		createCommandHelper = function (sType) {
			return Utils.createCommand(self, function () {
				this.replyOrforward(sType);
			}, self.canBeRepliedOrForwarded);
		}
	;

	this.oMessageScrollerDom = null;

	this.message = oData.message;
	this.messageLoading = oData.messageLoading;
	this.messageLoadingThrottle = oData.messageLoadingThrottle;
	this.messagesBodiesDom = oData.messagesBodiesDom;
	this.useThreads = oData.useThreads;
	this.replySameFolder = oData.replySameFolder;
	this.layout = oData.layout;
	this.usePreviewPane = oData.usePreviewPane;
	this.isMessageSelected = oData.isMessageSelected;
	this.messageActiveDom = oData.messageActiveDom;
	this.messageError = oData.messageError;

	this.fullScreenMode = oData.messageFullScreenMode;

	this.showFullInfo = ko.observable(false);

	this.messageVisibility = ko.computed(function () {
		return !this.messageLoadingThrottle() && !!this.message();
	}, this);
	
	this.canBeRepliedOrForwarded = this.messageVisibility;

	// commands
	this.closeMessage = Utils.createCommand(this, function () {
		if (Enums.Layout.NoPreview === oData.layout())
		{
			RL.historyBack();
		}
		else
		{
			oData.message(null);
		}
	});

	this.replyCommand = createCommandHelper(Enums.ComposeType.Reply);
	this.replyAllCommand = createCommandHelper(Enums.ComposeType.ReplyAll);
	this.forwardCommand = createCommandHelper(Enums.ComposeType.Forward);
	this.forwardAsAttachmentCommand = createCommandHelper(Enums.ComposeType.ForwardAsAttachment);
	this.editAsNewCommand = createCommandHelper(Enums.ComposeType.EditAsNew);
	
	this.messageVisibilityCommand = Utils.createCommand(this, Utils.emptyFunction, this.messageVisibility);
	
	this.messageEditCommand = Utils.createCommand(this, function () {
		this.editMessage();
	}, this.messageVisibility);

	this.deleteCommand = Utils.createCommand(this, function () {

		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}

	}, this.messageVisibility);
	
	this.archiveCommand = Utils.createCommand(this, function () {

		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Archive,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}

	}, this.messageVisibility);
	
	this.spamCommand = Utils.createCommand(this, function () {

		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}
		
	}, this.messageVisibility);

	// viewer
	this.viewSubject = ko.observable('');
	this.viewFromShort = ko.observable('');
	this.viewToShort = ko.observable('');
	this.viewFrom = ko.observable('');
	this.viewTo = ko.observable('');
	this.viewCc = ko.observable('');
	this.viewBcc = ko.observable('');
	this.viewDate = ko.observable('');
	this.viewMoment = ko.observable('');
	this.viewLineAsCcc = ko.observable('');
	this.viewViewLink = ko.observable('');
	this.viewDownloadLink = ko.observable('');
	this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
	this.viewUserPicVisible = ko.observable(false);
	
	this.viewPgpPassword = ko.observable('');
	this.viewPgpSignedVerifyStatus = ko.computed(function () {
		return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
	}, this);

	this.viewPgpSignedVerifyUser = ko.computed(function () {
		return this.message() ? this.message().pgpSignedVerifyUser() : '';
	}, this);
	

	this.message.subscribe(function (oMessage) {

		this.messageActiveDom(null);

		this.viewPgpPassword('');

		if (oMessage)
		{
			this.viewSubject(oMessage.subject());
			this.viewFromShort(oMessage.fromToLine(true, true));
			this.viewToShort(oMessage.toToLine(true, true));
			this.viewFrom(oMessage.fromToLine(false));
			this.viewTo(oMessage.toToLine(false));
			this.viewCc(oMessage.ccToLine(false));
			this.viewBcc(oMessage.bccToLine(false));
			this.viewDate(oMessage.fullFormatDateValue());
			this.viewMoment(oMessage.momentDate());
			this.viewLineAsCcc(oMessage.lineAsCcc());
			this.viewViewLink(oMessage.viewLink());
			this.viewDownloadLink(oMessage.downloadLink());

			sPic = RL.cache().getUserPic(oMessage.fromAsSingleEmail());
			if (sPic !== this.viewUserPic())
			{
				this.viewUserPicVisible(false);
				this.viewUserPic(Consts.DataImages.UserDotPic);
				if ('' !== sPic)
				{
					this.viewUserPicVisible(true);
					this.viewUserPic(sPic);
				}
			}
		}
		
	}, this);

	this.fullScreenMode.subscribe(function (bValue) {
		if (bValue)
		{
			$html.addClass('rl-message-fullscreen');
		}
		else
		{
			$html.removeClass('rl-message-fullscreen');
		}

		Utils.windowResize();
	});

	this.messageLoadingThrottle.subscribe(function (bV) {
		if (bV)
		{
			Utils.windowResize();
		}
	});

	this.messageActiveDom.subscribe(function () {
		this.scrollMessageToTop();
	}, this);

	this.goUpCommand = Utils.createCommand(this, function () {
		RL.pub('mailbox.message-list.selector.go-up');
	});
	
	this.goDownCommand = Utils.createCommand(this, function () {
		RL.pub('mailbox.message-list.selector.go-down');
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxMessageViewViewModel', MailBoxMessageViewViewModel);

MailBoxMessageViewViewModel.prototype.isPgpActionVisible = function ()
{
	return Enums.SignedVerifyStatus.Success !== this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.isPgpStatusVerifyVisible = function ()
{
	return Enums.SignedVerifyStatus.None !== this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.isPgpStatusVerifySuccess = function ()
{
	return Enums.SignedVerifyStatus.Success === this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.pgpStatusVerifyMessage = function ()
{
	var sResult = '';
	switch (this.viewPgpSignedVerifyStatus())
	{
		// TODO i18n
		case Enums.SignedVerifyStatus.UnknownPublicKeys:
			sResult = 'No public keys found';
			break;
		case Enums.SignedVerifyStatus.UnknownPrivateKey:
			sResult = 'No private key found';
			break;
		case Enums.SignedVerifyStatus.Unverified:
			sResult = 'Unverified signature';
			break;
		case Enums.SignedVerifyStatus.Error:
			sResult = 'OpenPGP decryption error';
			break;
		case Enums.SignedVerifyStatus.Success:
			sResult = 'Good signature from ' + this.viewPgpSignedVerifyUser();
			break;
	}

	return sResult;
};

MailBoxMessageViewViewModel.prototype.scrollToTop = function ()
{
	var oCont = $('.messageItem.nano .content', this.viewModelDom);
	if (oCont && oCont[0])
	{
//		oCont.animate({'scrollTop': 0}, 300);
		oCont.scrollTop(0);
	}
	else
	{
//		$('.messageItem', this.viewModelDom).animate({'scrollTop': 0}, 300);
		$('.messageItem', this.viewModelDom).scrollTop(0);
	}
	
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.fullScreen = function ()
{
	this.fullScreenMode(true);
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.unFullScreen = function ()
{
	this.fullScreenMode(false);
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.toggleFullScreen = function ()
{
	Utils.removeSelection();

	this.fullScreenMode(!this.fullScreenMode());
	Utils.windowResize();
};

/**
 * @param {string} sType
 */
MailBoxMessageViewViewModel.prototype.replyOrforward = function (sType)
{
	kn.showScreenPopup(PopupsComposeViewModel, [sType, RL.data().message()]);
};

MailBoxMessageViewViewModel.prototype.onBuild = function (oDom)
{
	var 
		self = this,
		oData = RL.data()
	;
	
	$document.on('keydown', function (oEvent) {

		var
			bResult = true,
			iKeyCode = oEvent ? oEvent.keyCode : 0
		;

		if (0 < iKeyCode && (Enums.EventKeyCode.Esc === iKeyCode) &&
			self.viewModelVisibility() && oData.useKeyboardShortcuts() && !Utils.inFocus() && oData.message())
		{
			self.fullScreenMode(false);
			if (Enums.Layout.NoPreview === oData.layout())
			{
				RL.historyBack();
			}

			bResult = false;
		}

		return bResult;
	});

	$('.attachmentsPlace', oDom).magnificPopup({
		'delegate': '.magnificPopupImage:visible',
		'type': 'image',
		'gallery': {
			'enabled': true,
			'preload': [1, 1],
			'navigateByImgClick': true
		},
		'callbacks': {
			'open': function() {
				oData.useKeyboardShortcuts(false);
			},
			'close': function() {
				oData.useKeyboardShortcuts(true);
			}
		},
		'mainClass': 'mfp-fade',
		'removalDelay': 400
	});

	oDom
		.on('mousedown', 'a', function (oEvent) {
			// setup maito protocol
			return !(oEvent && 3 !== oEvent['which'] && RL.mailToHelper($(this).attr('href')));
		})
		.on('click', '.attachmentsPlace .attachmentPreview', function (oEvent) {
			if (oEvent && oEvent.stopPropagation)
			{
				oEvent.stopPropagation();
			}
		})
		.on('click', '.attachmentsPlace .attachmentItem', function () {

			var
				oAttachment = ko.dataFor(this)
			;

			if (oAttachment && oAttachment.download)
			{
				RL.download(oAttachment.linkDownload());
			}
		})
	;

	this.oMessageScrollerDom = oDom.find('.messageItem .content');
	this.oMessageScrollerDom = this.oMessageScrollerDom && this.oMessageScrollerDom[0] ? this.oMessageScrollerDom : null;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isDraftFolder = function ()
{
	return RL.data().message() && RL.data().draftFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSentFolder = function ()
{
	return RL.data().message() && RL.data().sentFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSpamFolder = function ()
{
	return RL.data().message() && RL.data().spamFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSpamDisabled = function ()
{
	return RL.data().message() && RL.data().spamFolder() === Consts.Values.UnuseOptionValue;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isArchiveFolder = function ()
{
	return RL.data().message() && RL.data().archiveFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isArchiveDisabled = function ()
{
	return RL.data().message() && RL.data().archiveFolder() === Consts.Values.UnuseOptionValue;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isDraftOrSentFolder = function ()
{
	return this.isDraftFolder() || this.isSentFolder();
};

MailBoxMessageViewViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxMessageViewViewModel.prototype.editMessage = function ()
{
	if (RL.data().message())
	{
		kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Draft, RL.data().message()]);
	}
};

MailBoxMessageViewViewModel.prototype.scrollMessageToTop = function ()
{
	if (this.oMessageScrollerDom)
	{
		this.oMessageScrollerDom.scrollTop(0);
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.showImages = function (oMessage)
{
	if (oMessage && oMessage.showExternalImages)
	{
		oMessage.showExternalImages(true);
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.verifyPgpSignedClearMessage = function (oMessage)
{
	if (oMessage)
	{
		oMessage.verifyPgpSignedClearMessage();
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.decryptPgpEncryptedMessage = function (oMessage)
{
	if (oMessage)
	{
		oMessage.decryptPgpEncryptedMessage(this.viewPgpPassword());
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.readReceipt = function (oMessage)
{
	if (oMessage && '' !== oMessage.readReceipt())
	{
		RL.remote().sendReadReceiptMessage(Utils.emptyFunction, oMessage.folderFullNameRaw, oMessage.uid,
			oMessage.readReceipt(), 
			Utils.i18n('READ_RECEIPT/SUBJECT', {'SUBJECT': oMessage.subject()}),
			Utils.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': oMessage.readReceipt()}));

		oMessage.isReadReceipt(true);

		RL.cache().storeMessageFlagsToCache(oMessage);
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};
