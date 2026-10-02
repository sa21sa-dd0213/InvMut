import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant mef6697ff (getFactoryArtId returns 0)", function () {
  it("should return correct artId from getFactoryArtId for a valid tokenId, mutant returns 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor has no arguments based on contract code: constructor() { _disableInitializers(); })
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory contract to set as phiFactoryContract
    // Since PhiNFT1155 interacts with phiFactoryContract, we need to deploy a minimal mock
    const MockPhiFactory = await ethers.getContractFactory(
      "contract PhiFactoryMock { function artData(uint256) external view returns (address artist, address receiver, uint256 artChainId, uint256 maxSupply, uint256 endTime, uint256 startTime, bytes memory credData, uint256 artId, string memory uri, uint256 mintFee, bool soulBounded) { return (address(0), address(0), 0, 0, 0, 0, new bytes(0), 0, '', 0, false); } function protocolFeeDestination() external view returns (address) { return address(0); } function getTokenURI(uint256) external view returns (string memory) { return ''; } function contractURI(address) external view returns (string memory) { return ''; } function artCreateFee() external view returns (uint256) { return 0; } function phiRewardsAddress() external view returns (address) { return address(0); } }"
    );
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract
    // initialize(uint256 credChainId_, uint256 credId_, string memory verificationType_, address protocolFeeDestination_)
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      await mockFactory.getAddress() // protocolFeeDestination (uses phiFactoryContract.protocolFeeDestination())
    );
    
    // We need to set the phiFactoryContract to our mock
    // The initialize function sets phiFactoryContract = msg.sender (which is owner)
    // So we need to deploy a contract that implements IPhiFactory and set it
    // Since we cannot easily set it, let's use a different approach: deploy with a proper mock
    
    // Deploy a proper mock that implements the needed interface
    const ProperMockFactory = await ethers.getContractFactory(
      `contract ProperPhiFactoryMock {
        address public protocolFeeDest;
        uint256 public artCreateFeeValue;
        address public phiRewardsAddr;
        
        constructor() {
          protocolFeeDest = address(0x1234567890123456789012345678901234567890);
          artCreateFeeValue = 0;
          phiRewardsAddr = address(0x1234567890123456789012345678901234567891);
        }
        
        function protocolFeeDestination() external view returns (address) { return protocolFeeDest; }
        function artCreateFee() external view returns (uint256) { return artCreateFeeValue; }
        function phiRewardsAddress() external view returns (address) { return phiRewardsAddr; }
        function contractURI(address) external pure returns (string memory) { return ''; }
        function getTokenURI(uint256) external pure returns (string memory) { return ''; }
        function artData(uint256) external pure returns (address artist, address receiver, uint256 artChainId, uint256 maxSupply, uint256 endTime, uint256 startTime, bytes memory credData, uint256 artId, string memory uri, uint256 mintFee, bool soulBounded) {
          return (address(0), address(0), 0, 0, 0, 0, new bytes(0), 0, '', 0, false);
        }
        function createArtFromFactory(uint256) external payable returns (uint256) { return 0; }
        function claimFromFactory(uint256, address, address, address, uint256, bytes32, string calldata) external payable {}
      }`
    );
    const properMockFactory = await ProperMockFactory.deploy();
    await properMockFactory.waitForDeployment();
    
    // Deploy a new instance and set the factory properly
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // We need to call initialize with the mock factory as msg.sender, so we'll use a helper contract
    // Since we cannot change msg.sender easily, let's use a different approach:
    // Deploy a minimal proxy that forwards calls
    
    // Actually, let's just test the getFactoryArtId function directly by setting storage
    // through the _tokenIdToArtId mapping via the onlyPhiFactory functions
    
    // The simplest approach: deploy, initialize, then use createArtFromFactory which sets the mapping
    // But createArtFromFactory requires onlyPhiFactory modifier
    
    // Let's use the fact that we can deploy with owner as phiFactoryContract
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    // Call initialize with owner as the protocolFeeDestination
    await instance3.initialize(1, 1, "test", owner.address);
    
    // Now phiFactoryContract is set to owner (msg.sender during initialize)
    // We need to call createArtFromFactory which requires onlyPhiFactory
    // Since phiFactoryContract is owner, we can call it from owner
    
    // But createArtFromFactory expects msg.sender == address(phiFactoryContract)
    // So owner can call it
    
    // Call createArtFromFactory to set the mapping
    await instance3.createArtFromFactory(42, { value: 0 });
    
    // Now tokenId 1 should map to artId 42
    const tokenId = 1;
    const expectedArtId = 42;
    
    // Call getFactoryArtId - the original returns 42, mutant returns 0
    const result = await instance3.getFactoryArtId(tokenId);
    
    // Assert that the result is the expected artId
    // The mutant will return 0, which should fail this assertion
    expect(result).to.equal(expectedArtId);
  });
});