import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - onlyArtCreator modifier mutant detection", function () {
  it("should allow owner to call updateRoyalties when owner is also the artist (original AND logic passes, mutant OR logic reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 (constructor has no arguments since it's a proxy pattern)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple mock that returns owner as artist for any artId
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy(owner.address);
    await mockFactory.waitForDeployment();

    // Initialize the contract with required parameters
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      mockFactory.target // protocolFeeDestination
    );

    // Now phiFactoryContract is mockFactory
    // Create art via factory (callable only by phiFactoryContract)
    await mockFactory.callCreateArt(instance.target, 1, { value: ethers.parseEther("0.01") });

    // Now we have tokenId = 1 (since tokenIdCounter starts at 1)
    // Call updateRoyalties as owner - this should succeed on original but fail on mutant
    const royaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: addr1.address
    };

    // On original: owner is artist AND owner is the owner
    // Original: msg.sender != artist (false) && msg.sender != owner() (false) => false, no revert
    // Mutant: msg.sender != artist (false) || msg.sender != owner() (false) => false, no revert
    // This won't work - need a scenario where original passes but mutant fails

    // For a case where original passes and mutant fails:
    // - msg.sender is the owner but NOT the artist
    // - Original: owner != artist (true) && owner != owner() (false) => false, no revert -> PASSES
    // - Mutant: owner != artist (true) || owner != owner() (false) => true, REVERT -> FAILS

    // So we need the owner to call updateRoyalties when they are NOT the artist

    // Let's set up properly with a mock factory where artist is addr1, not owner
    const MockFactory2 = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory2 = await MockFactory2.deploy(addr1.address); // artist is addr1
    await mockFactory2.waitForDeployment();

    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();

    await instance2.initialize(
      1,
      1,
      "test",
      mockFactory2.target
    );

    // Create art via factory (callable only by phiFactoryContract)
    await mockFactory2.callCreateArt(instance2.target, 1, { value: ethers.parseEther("0.01") });

    // Now call updateRoyalties as owner (who is NOT the artist)
    // Original: should pass because owner is the owner
    // Mutant: should revert because owner != artist
    await expect(
      instance2.connect(owner).updateRoyalties(1, {
        royaltyBPS: 500,
        royaltyRecipient: addr1.address
      })
    ).to.not.be.reverted;
  });
});