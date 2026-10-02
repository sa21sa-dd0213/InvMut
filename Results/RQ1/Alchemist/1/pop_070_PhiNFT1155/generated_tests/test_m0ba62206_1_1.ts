import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  PhiNFT1155, 
  PhiFactory, 
  PhiRewards,
  IERC1155Receiver
} from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PhiNFT1155", function () {
  let phiNFT1155: PhiNFT1155;
  let phiFactory: PhiFactory;
  let phiRewards: PhiRewards;
  let owner: SignerWithAddress;
  let artist: SignerWithAddress;
  let minter: SignerWithAddress;
  let verifier: SignerWithAddress;
  let referrer: SignerWithAddress;
  let protocolFeeDestination: SignerWithAddress;
  let signer: SignerWithAddress;
  
  const CRED_ID = 1;
  const CRED_CHAIN_ID = 1;
  const VERIFICATION_TYPE = "SIGNATURE";
  const MINT_FEE = ethers.parseEther("0.01");
  const PROTOCOL_FEE = ethers.parseEther("0.001");
  const ART_CREATE_FEE = ethers.parseEther("0.005");

  beforeEach(async function () {
    [owner, artist, minter, verifier, referrer, protocolFeeDestination, signer] = 
      await ethers.getSigners();

    // Deploy PhiRewards
    const PhiRewardsFactory = await ethers.getContractFactory("PhiRewards");
    phiRewards = await PhiRewardsFactory.deploy();
    await phiRewards.waitForDeployment();

    // Deploy PhiFactory
    const PhiFactoryFactory = await ethers.getContractFactory("PhiFactory");
    phiFactory = await upgrades.deployProxy(PhiFactoryFactory, [
      owner.address,
      await phiRewards.getAddress(),
      signer.address,
      PROTOCOL_FEE,
      ART_CREATE_FEE,
      protocolFeeDestination.address
    ]);
    await phiFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    phiNFT1155 = await upgrades.deployProxy(PhiNFT1155Factory, [
      CRED_CHAIN_ID,
      CRED_ID,
      VERIFICATION_TYPE,
      protocolFeeDestination.address
    ]);
    await phiNFT1155.waitForDeployment();

    // Set the NFT contract address in PhiFactory
    await phiFactory.setErc1155ArtAddress(await phiNFT1155.getAddress());

    // Initialize PhiNFT1155 with PhiFactory as owner
    await phiNFT1155.transferOwnership(await phiFactory.getAddress());
  });

  describe("Initialization", function () {
    it("should initialize with correct parameters", async function () {
      expect(await phiNFT1155.credId()).to.equal(CRED_ID);
      expect(await phiNFT1155.credChainId()).to.equal(CRED_CHAIN_ID);
      expect(await phiNFT1155.verificationType()).to.equal(VERIFICATION_TYPE);
      expect(await phiNFT1155.tokenIdCounter()).to.equal(1);
    });

    it("should set correct name and symbol", async function () {
      const expectedName = `Phi Cred-${CRED_ID} on Chain-${CRED_CHAIN_ID}`;
      const expectedSymbol = `PHI-${CRED_ID}-${CRED_CHAIN_ID}`;
      expect(await phiNFT1155.name()).to.equal(expectedName);
      expect(await phiNFT1155.symbol()).to.equal(expectedSymbol);
    });
  });

  describe("Art Creation", function () {
    const createConfig = {
      artist: ethers.ZeroAddress, // Will be set in test
      receiver: ethers.ZeroAddress,
      endTime: 0,
      startTime: 0,
      maxSupply: 100,
      mintFee: MINT_FEE,
      soulBounded: false
    };

    it("should create art from factory", async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600;
      
      const config = {
        ...createConfig,
        artist: artist.address,
        receiver: artist.address,
        startTime,
        endTime
      };

      // Create art through factory
      const tx = await phiFactory.connect(artist).createArt(
        config,
        "ipfs://test-uri",
        credId
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "NewArtCreated"
      );
      const artId = event?.args?.artId;

      expect(artId).to.not.be.undefined;
      
      const tokenId = await phiNFT1155.getTokenIdFromFactoryArtId(artId);
      expect(tokenId).to.equal(1);
    });

    it("should mint tokens from factory", async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600;
      
      const config = {
        ...createConfig,
        artist: artist.address,
        receiver: artist.address,
        startTime,
        endTime
      };

      await phiFactory.connect(artist).createArt(
        config,
        "ipfs://test-uri",
        credId
      );

      // Mint tokens
      const mintAmount = ethers.parseEther("0.05");
      await phiFactory.connect(minter).claim(
        [1],
        [1],
        minter.address,
        referrer.address,
        verifier.address,
        { value: mintAmount }
      );

      expect(await phiNFT1155.balanceOf(minter.address, 1)).to.equal(1);
    });
  });

  describe("Royalties", function () {
    it("should set default royalties", async function () {
      const royalties = await phiNFT1155.getRoyalties(1);
      expect(royalties.royaltyBPS).to.equal(500);
      expect(royalties.royaltyRecipient).to.equal(protocolFeeDestination.address);
    });

    it("should update royalties for art creator", async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600;
      
      const config = {
        artist: artist.address,
        receiver: artist.address,
        endTime,
        startTime,
        maxSupply: 100,
        mintFee: MINT_FEE,
        soulBounded: false
      };

      await phiFactory.connect(artist).createArt(
        config,
        "ipfs://test-uri",
        credId
      );

      // Transfer ownership to artist for royalty update
      await phiNFT1155.connect(await ethers.getImpersonatedSigner(await phiFactory.getAddress()))
        .transferOwnership(artist.address);

      const newRoyalties = {
        royaltyBPS: 1000,
        royaltyRecipient: artist.address
      };

      await phiNFT1155.connect(artist).updateRoyalties(1, newRoyalties);
      
      const updatedRoyalties = await phiNFT1155.getRoyalties(1);
      expect(updatedRoyalties.royaltyBPS).to.equal(1000);
      expect(updatedRoyalties.royaltyRecipient).to.equal(artist.address);
    });
  });

  describe("Transfer Restrictions", function () {
    it("should prevent transfer of soulbound tokens", async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600;
      
      const config = {
        artist: artist.address,
        receiver: artist.address,
        endTime,
        startTime,
        maxSupply: 100,
        mintFee: MINT_FEE,
        soulBounded: true
      };

      await phiFactory.connect(artist).createArt(
        config,
        "ipfs://test-uri",
        credId
      );

      const mintAmount = ethers.parseEther("0.05");
      await phiFactory.connect(minter).claim(
        [1],
        [1],
        minter.address,
        referrer.address,
        verifier.address,
        { value: mintAmount }
      );

      await expect(
        phiNFT1155.connect(minter).safeTransferFrom(
          minter.address,
          referrer.address,
          1,
          1,
          "0x"
        )
      ).to.be.revertedWithCustomError(phiNFT1155, "TokenNotTransferable");
    });
  });

  describe("Pausability", function () {
    it("should pause and unpause", async function () {
      await phiNFT1155.connect(owner).pause();
      expect(await phiNFT1155.paused()).to.be.true;

      await phiNFT1155.connect(owner).unPause();
      expect(await phiNFT1155.paused()).to.be.false;
    });

    it("should prevent minting when paused", async function () {
      await phiNFT1155.connect(owner).pause();

      const startTime = await time.latest();
      const endTime = startTime + 3600;
      
      const config = {
        artist: artist.address,
        receiver: artist.address,
        endTime,
        startTime,
        maxSupply: 100,
        mintFee: MINT_FEE,
        soulBounded: false
      };

      await expect(
        phiFactory.connect(artist).createArt(
          config,
          "ipfs://test-uri",
          credId
        )
      ).to.be.revertedWithCustomError(phiNFT1155, "EnforcedPause");
    });
  });

  describe("Upgradeability", function () {
    it("should upgrade to new implementation", async function () {
      const PhiNFT1155V2 = await ethers.getContractFactory("PhiNFT1155");
      const upgraded = await upgrades.upgradeProxy(
        await phiNFT1155.getAddress(),
        PhiNFT1155V2
      );
      await upgraded.waitForDeployment();
      
      expect(await upgraded.version()).to.equal(1);
    });
  });
});