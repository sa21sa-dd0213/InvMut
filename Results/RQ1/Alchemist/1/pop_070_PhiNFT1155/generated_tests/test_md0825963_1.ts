import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant md0825963 - onlyPhiFactory modifier", function () {
  it("should kill mutant by calling createArtFromFactory from the PhiFactory contract and expecting success (mutant reverts when it should not)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155Factory.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Deploy a mock PhiFactory contract that will call createArtFromFactory
    // We need to create a minimal factory that sets the protocolFeeDestination and artCreateFee
    const MockPhiFactory = await ethers.getContractFactory(
      "contracts/mocks/MockPhiFactory.sol:MockPhiFactory"
    );
    
    // If MockPhiFactory doesn't exist, we'll deploy a simple contract that mimics the interface
    const mockFactoryCode = `
      pragma solidity ^0.8.0;
      contract MockPhiFactory {
          address public protocolFeeDestination;
          uint256 public artCreateFee = 0.001 ether;
          
          function setProtocolFeeDestination(address dest) external {
              protocolFeeDestination = dest;
          }
          
          function artData(uint256) external view returns (
              address artist,
              address receiver,
              uint256 credChainId,
              string memory verificationType,
              string memory uri,
              address artAddress,
              uint256 tokenId,
              address artist2,
              address receiver2,
              uint256 maxSupply,
              uint256 mintFee,
              uint256 startTime,
              uint256 endTime,
              uint256 numberMinted,
              bool soulBounded
          ) {
              // Return dummy data
          }
          
          function phiRewardsAddress() external view returns (address) {
              return address(this);
          }
          
          function contractURI(address) external view returns (string memory) {
              return "";
          }
          
          function getTokenURI(uint256) external view returns (string memory) {
              return "";
          }
          
          receive() external payable {}
      }
    `;
    
    const MockFactory = await ethers.getContractFactory(mockFactoryCode);
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize PhiNFT1155 - this sets phiFactoryContract to msg.sender (owner)
    await phiNFT1155.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Now we need to simulate that the PhiFactory contract calls createArtFromFactory
    // The onlyPhiFactory modifier checks if msg.sender == address(phiFactoryContract)
    // In the original, it should NOT revert when called from phiFactoryContract
    // In the mutant, it WILL revert because the condition is inverted
    
    // We need to deploy a contract that will call createArtFromFactory on our behalf
    // This contract will be set as phiFactoryContract
    const CallerContract = await ethers.getContractFactory(
      "contracts/mocks/CallerContract.sol:CallerContract"
    );
    
    // If CallerContract doesn't exist, create it inline
    const callerCode = `
      pragma solidity ^0.8.0;
      interface IPhiNFT1155 {
          function createArtFromFactory(uint256 artId_) external payable returns (uint256);
      }
      
      contract CallerContract {
          function callCreateArt(address phiNFT, uint256 artId) external payable returns (uint256) {
              return IPhiNFT1155(phiNFT).createArtFromFactory{value: msg.value}(artId);
          }
          receive() external payable {}
      }
    `;
    
    const CallerFactory = await ethers.getContractFactory(callerCode);
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();
    
    // Deploy a separate PhiNFT1155 that we'll reinitialize with the caller as phiFactoryContract
    const PhiNFT1155Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155_2 = await PhiNFT1155Factory2.deploy();
    await phiNFT1155_2.waitForDeployment();
    
    // Initialize with caller as phiFactoryContract (msg.sender = owner, but we'll set it differently)
    // Actually, the initialize function sets phiFactoryContract = msg.sender
    // So we need to call initialize from the caller contract
    
    // Better approach: Deploy a contract that acts as phiFactory and calls createArtFromFactory
    // The key insight: in the mutant, when the phiFactoryContract calls, it REVERTS
    // In the original, when the phiFactoryContract calls, it SUCCEEDS
    
    // Let's test by calling createArtFromFactory directly from the phiFactoryContract
    // Since we can't change msg.sender, we'll create a scenario where we test the revert behavior
    
    // Deploy a new instance that we control
    const PhiNFT1155Factory3 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155_3 = await PhiNFT1155Factory3.deploy();
    await phiNFT1155_3.waitForDeployment();
    
    // Create a wrapper that will call the function and we can check if it reverts
    const wrapperCode = `
      pragma solidity ^0.8.0;
      interface IPhiNFT1155 {
          function createArtFromFactory(uint256 artId_) external payable returns (uint256);
      }
      
      contract TestWrapper {
          bool public shouldRevert;
          address public target;
          
          function setTarget(address _target) external {
              target = _target;
          }
          
          function testCall(uint256 artId) external payable returns (bool) {
              (bool success, ) = target.call{value: msg.value}(
                  abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
              );
              return success;
          }
          
          receive() external payable {}
      }
    `;
    
    const WrapperFactory = await ethers.getContractFactory(wrapperCode);
    const wrapper = await WrapperFactory.deploy();
    await wrapper.waitForDeployment();
    
    // Initialize phiNFT1155_3 with the wrapper as the phiFactoryContract
    // But we can't because initialize sets phiFactoryContract = msg.sender
    // So we need a different approach
    
    // Let's directly test the modifier logic by checking if the function reverts
    // when called from a non-factory address vs factory address
    
    // Actually, the simplest approach: 
    // 1. Deploy PhiNFT1155
    // 2. Initialize it (msg.sender becomes phiFactoryContract)
    // 3. Try to call createArtFromFactory from a DIFFERENT address (not the factory)
    //    - Original: should revert (NotPhiFactory)
    //    - Mutant: should SUCCEED (because condition is == instead of !=)
    // 4. Then try to call from the FACTORY address (owner)
    //    - Original: should succeed
    //    - Mutant: should REVERT
    
    // Step 1 & 2 already done - owner is phiFactoryContract
    
    // Test 1: Call from non-factory address (addr1) - should revert in original, succeed in mutant
    // Test 2: Call from factory address (owner) - should succeed in original, revert in mutant
    
    // We'll test Test 2 first as it directly kills the mutant
    await expect(
      phiNFT1155.connect(owner).createArtFromFactory(1, { value: ethers.parseEther("0.002") })
    ).to.not.be.reverted;
    
    // In the mutant, the above would revert because msg.sender == phiFactoryContract triggers the revert
    // So a test that expects it NOT to revert will FAIL on the mutant, thus killing it
    
    // Additional assertion to ensure the function actually executed
    const tokenId = await phiNFT1155.tokenIdCounter();
    expect(tokenId).to.be.gt(0);
  });
});