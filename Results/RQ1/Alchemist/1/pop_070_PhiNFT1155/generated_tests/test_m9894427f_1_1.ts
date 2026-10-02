import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  PhiNFT1155, 
  PhiFactoryMock, 
  PhiRewardsMock 
} from "../typechain-types";

describe("PhiNFT1155", function () {
  let phiNFT: PhiNFT1155;
  let owner: SignerWithAddress;
  let artist: SignerWithAddress;
  let minter: SignerWithAddress;
  let verifier: SignerWithAddress;
  let referrer: SignerWithAddress;
  let protocolFeeDestination: SignerWithAddress;
  let phiFactory: PhiFactoryMock;
  let phiRewards: PhiRewardsMock;

  const CRED_CHAIN_ID = 1;
  const CRED_ID = 1;
  const VERIFICATION_TYPE = "SIGNATURE";
  const ART_ID = 1;
  const MINT_FEE = ethers.parseEther("0.1");
  const ART_CREATE_FEE = ethers.parseEther("0.01");
  const QUANTITY = 1;

  beforeEach(async function () {
    [owner, artist, minter, verifier, referrer, protocolFeeDestination] = await ethers.getSigners();

    // Deploy mock contracts
    const PhiFactoryMock = await ethers.getContractFactory("PhiFactoryMock");
    phiFactory = await PhiFactoryMock.deploy();
    
    const PhiRewardsMock = await ethers.getContractFactory("PhiRewardsMock");
    phiRewards = await PhiRewardsMock.deploy();

    // Set up factory mock
    await phiFactory.setProtocolFeeDestination(protocolFeeDestination.address);
    await phiFactory.setPhiRewardsAddress(phiRewards.target);
    await phiFactory.setArtCreateFee(ART_CREATE_FEE);

    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    phiNFT = await PhiNFT1155.deploy();

    // Initialize
    await phiNFT.initialize(
      CRED_CHAIN_ID,
      CRED_ID,
      VERIFICATION_TYPE,
      protocolFeeDestination.address
    );

    // Create art data in factory
    const artData = {
      credId: CRED_ID,
      credCreator: owner.address,
      credChainId: CRED_CHAIN_ID,
      verificationType: VERIFICATION_TYPE,
      uri: "https://example.com/metadata/1",
      artAddress: await phiNFT.getAddress(),
      tokenId: 1,
      artist: artist.address,
      receiver: artist.address,
      royalties: {
        royaltyBPS: 500,
        royaltyRecipient: artist.address
      },
      maxSupply: 100,
      mintFee: MINT_FEE,
      startTime: 0,
      endTime: 0,
      numberMinted: 0,
      soulBounded: false
    };

    await phiFactory.setArtData(ART_ID, artData);
  });

  describe("Initialization", function () {
    it("should initialize correctly", async function () {
      expect(await phiNFT.credId()).to.equal(CRED_ID);
      expect(await phiNFT.credChainId()).to.equal(CRED_CHAIN_ID);
      expect(await phiNFT.verificationType()).to.equal(VERIFICATION_TYPE);
      expect(await phiNFT.tokenIdCounter()).to.equal(1);
      expect(await phiNFT.owner()).to.equal(owner.address);
    });

    it("should set protocol fee destination from factory", async function () {
      expect(await phiNFT.protocolFeeDestination()).to.equal(protocolFeeDestination.address);
    });
  });

  describe("createArtFromFactory", function () {
    it("should create art and return token id", async function () {
      const tx = await phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE });
      const receipt = await tx.wait();
      
      expect(await phiNFT.tokenIdCounter()).to.equal(2);
      expect(await phiNFT.getTokenIdFromFactoryArtId(ART_ID)).to.equal(1);
      expect(await phiNFT.getFactoryArtId(1)).to.equal(ART_ID);
    });

    it("should revert if not called by factory", async function () {
      await expect(
        phiNFT.connect(artist).createArtFromFactory(ART_ID, { value: ART_CREATE_FEE })
      ).to.be.revertedWithCustomError(phiNFT, "NotPhiFactory");
    });
  });

  describe("claimFromFactory", function () {
    beforeEach(async function () {
      await phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE });
    });

    it("should mint tokens successfully", async function () {
      const totalFee = MINT_FEE + (await phiFactory.artCreateFee());
      
      await expect(
        phiNFT.claimFromFactory(
          ART_ID,
          minter.address,
          referrer.address,
          verifier.address,
          QUANTITY,
          ethers.ZeroHash,
          "https://example.com/image.png",
          { value: totalFee }
        )
      ).to.emit(phiNFT, "TransferSingle");
      
      expect(await phiNFT.balanceOf(minter.address, 1)).to.equal(QUANTITY);
    });

    it("should revert if token not created", async function () {
      await expect(
        phiNFT.claimFromFactory(
          999,
          minter.address,
          referrer.address,
          verifier.address,
          QUANTITY,
          ethers.ZeroHash,
          "https://example.com/image.png"
        )
      ).to.be.revertedWithCustomError(phiNFT, "InValdidTokenId");
    });
  });

  describe("Royalties", function () {
    it("should set default royalties", async function () {
      const royalties = await phiNFT.getRoyalties(0);
      expect(royalties.royaltyBPS).to.equal(500);
      expect(royalties.royaltyRecipient).to.equal(protocolFeeDestination.address);
    });

    it("should update royalties for art creator", async function () {
      await phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE });
      
      const newConfig = {
        royaltyBPS: 1000,
        royaltyRecipient: artist.address
      };

      await phiNFT.connect(artist).updateRoyalties(1, newConfig);
      
      const royalties = await phiNFT.getRoyalties(1);
      expect(royalties.royaltyBPS).to.equal(1000);
      expect(royalties.royaltyRecipient).to.equal(artist.address);
    });
  });

  describe("Transfer restrictions", function () {
    beforeEach(async function () {
      await phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE });
      
      // Set soulbound
      const artData = await phiFactory.artData(ART_ID);
      artData.soulBounded = true;
      await phiFactory.setArtData(ART_ID, artData);
      
      // Mint token
      await phiNFT.claimFromFactory(
        ART_ID,
        minter.address,
        referrer.address,
        verifier.address,
        QUANTITY,
        ethers.ZeroHash,
        "https://example.com/image.png",
        { value: MINT_FEE + ART_CREATE_FEE }
      );
    });

    it("should prevent transfer of soulbound tokens", async function () {
      await expect(
        phiNFT.connect(minter).safeTransferFrom(
          minter.address,
          artist.address,
          1,
          1,
          "0x"
        )
      ).to.be.revertedWithCustomError(phiNFT, "TokenNotTransferable");
    });
  });

  describe("Pausing", function () {
    it("should pause and unpause", async function () {
      await phiNFT.pause();
      expect(await phiNFT.paused()).to.be.true;

      await phiNFT.unPause();
      expect(await phiNFT.paused()).to.be.false;
    });

    it("should prevent minting when paused", async function () {
      await phiNFT.pause();
      
      await expect(
        phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE })
      ).to.be.revertedWithCustomError(phiNFT, "EnforcedPause");
    });
  });

  describe("URI", function () {
    it("should return correct URI from factory", async function () {
      await phiNFT.createArtFromFactory(ART_ID, { value: ART_CREATE_FEE });
      
      const uri = await phiNFT.uri(1);
      expect(uri).to.equal("https://example.com/metadata/1");
    });
  });

  describe("Supports Interface", function () {
    it("should support required interfaces", async function () {
      expect(await phiNFT.supportsInterface("0xd9b67a26")).to.be.true; // ERC1155
      expect(await phiNFT.supportsInterface("0x2a55205a")).to.be.true; // ERC2981
    });
  });
});