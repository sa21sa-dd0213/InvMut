import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - safeTransferFrom soulbound check", function () {
  it("should revert when transferring a soulbound token from a non-zero address (original behavior), but mutant incorrectly allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (no constructor args needed since it uses _disableInitializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a mock PhiFactory to interact with
    // We need to deploy a minimal contract that implements IPhiFactory interface
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy(instanceAddress);
    await mockFactory.waitForDeployment();

    // Initialize the PhiNFT1155 contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Set the phiFactoryContract address on the instance
    // This requires calling the internal storage directly or using the initialize
    // Since we can't set it directly, we need to deploy with proper setup
    // For this test, we'll use a workaround by deploying a contract that can set the factory
    
    // Deploy a helper to set phiFactoryContract
    const HelperFactory = await ethers.getContractFactory("PhiNFT1155Helper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();
    
    // Set the factory address via the helper
    await helper.setPhiFactory(instanceAddress, mockFactory.target);
    
    // Create an art that is soulbound
    // First we need to mint a token to addr1
    // We'll simulate the factory creating art and minting
    
    // Create art data for a soulbound token
    const artId = 1;
    const tokenId = 1;
    const quantity = 1;
    
    // Mint token to addr1 via factory (simulated)
    await mockFactory.mintToken(
      instanceAddress,
      addr1.address,
      tokenId,
      quantity,
      "",
      ethers.ZeroHash
    );
    
    // Verify addr1 has the token
    expect(await instance.balanceOf(addr1.address, tokenId)).to.equal(1);
    
    // Try to transfer the soulbound token from addr1 to addr2
    // Original contract: should revert with TokenNotTransferable
    // Mutant: would allow the transfer (incorrectly)
    await expect(
      instance.connect(addr1).safeTransferFrom(
        addr1.address,
        addr2.address,
        tokenId,
        1,
        "0x"
      )
    ).to.be.revertedWith("TokenNotTransferable");
    
    // If we reach here on original, the revert was caught
    // If mutant passes, the test fails which kills the mutant
  });
});

// Helper contract to set phiFactory on PhiNFT1155
// This is needed because phiFactoryContract is set during initialize
// but we need to control it for testing
contract MockPhiFactory {
  address public phiNFT1155;
  uint256 public artCreateFee;
  address public protocolFeeDestination;
  address public phiRewardsAddress;
  
  constructor(address _phiNFT1155) {
    phiNFT1155 = _phiNFT1155;
    artCreateFee = 0;
    protocolFeeDestination = msg.sender;
    phiRewardsAddress = address(0);
  }
  
  function artData(uint256) external view returns (tuple(
    uint256 credId,
    address credCreator,
    uint256 credChainId,
    string verificationType,
    string uri,
    address artAddress,
    uint256 tokenId,
    address artist,
    address receiver,
    tuple(uint32 royaltyBPS, address royaltyRecipient) royalties,
    uint256 maxSupply,
    uint256 mintFee,
    uint256 startTime,
    uint256 endTime,
    uint256 numberMinted,
    bool soulBounded
  ) memory) {
    // Return default art data with soulBounded = true
    return (
      1, // credId
      address(0), // credCreator
      1, // credChainId
      "", // verificationType
      "", // uri
      address(0), // artAddress
      1, // tokenId
      msg.sender, // artist
      msg.sender, // receiver
      (500, msg.sender), // royalties
      100, // maxSupply
      0, // mintFee
      0, // startTime
      0, // endTime
      0, // numberMinted
      true // soulBounded = true
    );
  }
  
  function contractURI(address) external pure returns (string memory) {
    return "";
  }
  
  function getTokenURI(uint256) external pure returns (string memory) {
    return "";
  }
  
  function mintToken(address nft, address to, uint256 tokenId, uint256 quantity, string memory imageURI, bytes32 data) external {
    // Call the internal mint function via the public claimFromFactory
    // This simulates the factory minting
    (bool success, ) = nft.call(
      abi.encodeWithSignature(
        "claimFromFactory(uint256,address,address,address,uint256,bytes32,string)",
        1, // artId
        to,
        address(0), // ref
        address(0), // verifier
        quantity,
        data,
        imageURI
      )
    );
    require(success, "Mint failed");
  }
}