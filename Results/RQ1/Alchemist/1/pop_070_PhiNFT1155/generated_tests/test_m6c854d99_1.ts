import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - onlyArtCreator modifier mutant detection", function () {
  it("should allow owner to call updateRoyalties when owner is also the artist (original AND logic passes, mutant OR logic reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor has no arguments since it's a proxy pattern)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory to interact with PhiNFT1155
    // Since we need phiFactoryContract to be set for artData lookup, we need to deploy
    // a minimal implementation that returns the owner as artist
    const PhiFactoryMock = await ethers.getContractFactory("IPhiFactory");
    // We'll use a simpler approach: deploy PhiNFT1155 and set up the state manually
    // through the initialize function which sets phiFactoryContract to msg.sender
    
    // Initialize the contract with required parameters
    // Note: initialize expects (uint256 credChainId, uint256 credId, string verificationType, address protocolFeeDest)
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Now phiFactoryContract is set to owner (msg.sender of initialize)
    // We need to create an art entry in the factory to test the modifier
    // Since phiFactoryContract is owner's address, we need to deploy a mock contract
    // that implements the necessary functions
    
    // Deploy a simple mock that returns owner as artist for any artId
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy(owner.address);
    await mockFactory.waitForDeployment();
    
    // We need to set phiFactoryContract to our mock
    // But there's no setter for phiFactoryContract - it's set in initialize
    // So we need to re-deploy and initialize with the mock factory address
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    await instance2.initialize(
      1,
      1,
      "test",
      mockFactory.target // protocolFeeDestination
    );
    
    // Now phiFactoryContract is mockFactory
    // We need to create a token first to have a tokenId
    // createArtFromFactory can only be called by phiFactoryContract
    // Let's call it from mockFactory
    await mockFactory.callCreateArt(instance2.target, 1, { value: ethers.parseEther("0.01") });
    
    // Now we have tokenId = 1 (since tokenIdCounter starts at 1)
    // Call updateRoyalties as owner - this should succeed on original but fail on mutant
    const royaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: addr1.address
    };
    
    // On original: owner is not artist (artist is mockFactory?), but owner IS owner()
    // Actually owner is not the artist - mockFactory is the artist
    // Wait - we need to check what artData returns for the artist
    // The mock factory returns owner.address as artist
    // So owner is both the artist AND the owner
    // Original: msg.sender != artist (false) && msg.sender != owner() (false) => false, no revert
    // Mutant: msg.sender != artist (false) || msg.sender != owner() (false) => false, no revert
    
    // This won't work - need a scenario where original passes but mutant fails
    // Original: only reverts when BOTH conditions are false
    // Mutant: reverts when EITHER condition is false
    // For mutant to fail where original passes, we need msg.sender to be EITHER artist OR owner
    // but NOT both - wait, that's backwards
    
    // Let me reconsider:
    // Original: revert if (msg.sender != artist && msg.sender != owner())
    //   - Passes if msg.sender == artist OR msg.sender == owner()
    // Mutant: revert if (msg.sender != artist || msg.sender != owner())
    //   - Passes if msg.sender == artist AND msg.sender == owner()
    //   - Reverts if msg.sender != artist (even if owner) OR msg.sender != owner (even if artist)
    
    // So for a case where original passes and mutant fails:
    // - msg.sender is the owner but NOT the artist
    // - Original: owner != artist (true) && owner != owner() (false) => false, no revert -> PASSES
    // - Mutant: owner != artist (true) || owner != owner() (false) => true, REVERT -> FAILS
    
    // So we need the owner to call updateRoyalties when they are NOT the artist
    
    // Let's set up properly with a mock factory where artist is addr1, not owner
    const MockFactory2 = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory2 = await MockFactory2.deploy(addr1.address); // artist is addr1
    await mockFactory2.waitForDeployment();
    
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    await instance3.initialize(
      1,
      1,
      "test",
      mockFactory2.target
    );
    
    // Create art via factory (callable only by phiFactoryContract)
    await mockFactory2.callCreateArt(instance3.target, 1, { value: ethers.parseEther("0.01") });
    
    // Now call updateRoyalties as owner (who is NOT the artist)
    // Original: should pass because owner is the owner
    // Mutant: should revert because owner != artist
    await expect(
      instance3.connect(owner).updateRoyalties(1, {
        royaltyBPS: 500,
        royaltyRecipient: addr1.address
      })
    ).to.not.be.reverted;
  });
});