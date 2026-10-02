import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant mef6697ff (getFactoryArtId returns 0)", function () {
  it("should return correct artId from getFactoryArtId for a valid tokenId, mutant returns 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
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
        
        function artData(uint256) external pure returns (
          address artist, 
          address receiver, 
          uint256 artChainId, 
          uint256 maxSupply, 
          uint256 endTime, 
          uint256 startTime, 
          bytes memory credData, 
          uint256 artId, 
          string memory uri, 
          uint256 mintFee, 
          bool soulBounded
        ) {
          return (address(0), address(0), 0, 0, 0, 0, new bytes(0), 0, '', 0, false);
        }
        
        function createArtFromFactory(uint256) external payable returns (uint256) { return 0; }
        function claimFromFactory(uint256, address, address, address, uint256, bytes32, string calldata) external payable {}
      }`
    );
    const properMockFactory = await ProperMockFactory.deploy();
    await properMockFactory.waitForDeployment();
    
    // Deploy a new instance
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    // Call initialize with the mock factory address as the protocolFeeDestination
    // This will set phiFactoryContract = msg.sender (owner) during initialization
    await instance3.initialize(1, 1, "test", await properMockFactory.getAddress());
    
    // Now phiFactoryContract is set to owner (msg.sender during initialize)
    // Since the contract checks onlyPhiFactory modifier, we need to call createArtFromFactory as owner
    // But owner is not the phiFactoryContract - the initialize function sets phiFactoryContract = msg.sender
    // Actually looking at the code: phiFactoryContract = IPhiFactory(payable(msg.sender));
    // So after initialize, phiFactoryContract = owner
    
    // Call createArtFromFactory to set the mapping (onlyPhiFactory allows owner since phiFactoryContract = owner)
    await instance3.createArtFromFactory(42, { value: 0 });
    
    // Now tokenId 1 should map to artId 42
    const tokenId = 1;
    const expectedArtId = 42;
    
    // Call getFactoryArtId
    const result = await instance3.getFactoryArtId(tokenId);
    
    // Assert that the result is the expected artId
    expect(result).to.equal(expectedArtId);
  });
});