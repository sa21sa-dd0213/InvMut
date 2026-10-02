import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - Mutant m594f4fc0 (updateRoyalties access control)", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let phiFactoryMock: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor (no arguments as it uses _disableInitializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a minimal mock for IPhiFactory to satisfy the initialize and artData calls
    const PhiFactoryMock = await ethers.getContractFactory("IPhiFactoryMock");
    phiFactoryMock = await PhiFactoryMock.deploy();
    await phiFactoryMock.waitForDeployment();

    // Initialize the PhiNFT1155
    const credChainId = 1;
    const credId = 1;
    const verificationType = "signature";
    const protocolFeeDest = owner.address;

    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );

    // Set phiFactoryContract to our mock
    await instance.setPhiFactoryContract(phiFactoryMock.target);
  });

  it("should revert when unauthorized user tries to update royalties (mutant should allow it)", async function () {
    // First, create an art through the factory to have a valid tokenId with art data
    const artId = 1;
    await phiFactoryMock.setArtData(artId, owner.address, addr1.address); // artist = owner, receiver = addr1
    await instance.createArtFromFactory(artId, { value: ethers.parseEther("0.01") });

    const tokenId = await instance.tokenIdCounter();
    const createdTokenId = tokenId - 1n; // tokenIdCounter was incremented, so art tokenId = previous value

    // Try to update royalties as an unauthorized user (addr2)
    const newConfig = {
      royaltyBPS: 1000,
      royaltyRecipient: addr2.address
    };

    // On the original contract, this should revert with NotArtCreator
    // On the mutant (without modifier), it would succeed
    await expect(
      instance.connect(addr2).updateRoyalties(createdTokenId, newConfig)
    ).to.be.revertedWith("NotArtCreator");
  });
});

// Mock contract for IPhiFactory to make the test self-contained
// This would be deployed as a separate contract
contract IPhiFactoryMock {
  struct ArtData {
    uint256 credId;
    address credCreator;
    uint256 credChainId;
    string verificationType;
    string uri;
    address artAddress;
    uint256 tokenId;
    address artist;
    address receiver;
    ICreatorRoyaltiesControl.RoyaltyConfiguration royalties;
    uint256 maxSupply;
    uint256 mintFee;
    uint256 startTime;
    uint256 endTime;
    uint256 numberMinted;
    bool soulBounded;
  }

  mapping(uint256 => ArtData) public artDataMap;
  address public protocolFeeDestination;
  uint256 public artCreateFee = 0.01 ether;
  address public phiRewardsAddress;

  function setArtData(uint256 artId, address artist, address receiver) external {
    artDataMap[artId] = ArtData({
      credId: 1,
      credCreator: address(0),
      credChainId: 1,
      verificationType: "signature",
      uri: "https://example.com/token",
      artAddress: address(0),
      tokenId: 0,
      artist: artist,
      receiver: receiver,
      royalties: ICreatorRoyaltiesControl.RoyaltyConfiguration({royaltyBPS: 500, royaltyRecipient: address(0)}),
      maxSupply: 100,
      mintFee: 0.01 ether,
      startTime: 0,
      endTime: 0,
      numberMinted: 0,
      soulBounded: false
    });
  }

  function artData(uint256 artId) external view returns (ArtData memory) {
    return artDataMap[artId];
  }

  function protocolFeeDestination() external view returns (address) {
    return protocolFeeDestination;
  }

  function artCreateFee() external view returns (uint256) {
    return artCreateFee;
  }

  function phiRewardsAddress() external view returns (address) {
    return phiRewardsAddress;
  }

  function contractURI(address) external pure returns (string memory) {
    return "";
  }

  function getTokenURI(uint256) external pure returns (string memory) {
    return "";
  }

  function mintProtocolFee() external pure returns (uint256) {
    return 0;
  }

  function getNumberMinted(uint256) external pure returns (uint256) {
    return 0;
  }

  function getArtMintFee(uint256, uint256) external pure returns (uint256) {
    return 0;
  }

  function getTotalMintFee(uint256[] memory, uint256[] memory) external pure returns (uint256) {
    return 0;
  }

  function isCredMinted(uint256, uint256, address) external pure returns (bool) {
    return false;
  }

  function isArtMinted(uint256, address) external pure returns (bool) {
    return false;
  }

  function getArtAddress(uint256) external pure returns (address) {
    return address(0);
  }

  function signatureClaim(bytes calldata, bytes calldata, IPhiFactory.MintArgs calldata) external payable {}
  function merkleClaim(bytes32[] calldata, bytes calldata, IPhiFactory.MintArgs calldata, bytes32) external payable {}
  function claim(bytes calldata) external payable {}
  function batchClaim(bytes[] calldata, uint256[] calldata) external payable {}
  function setPhiSignerAddress(address) external {}
  function setErc1155ArtAddress(address) external {}
  function setProtocolFeeDestination(address) external {}
  function setProtocolFee(uint256) external {}
  function setArtCreatFee(uint256) external {}
}