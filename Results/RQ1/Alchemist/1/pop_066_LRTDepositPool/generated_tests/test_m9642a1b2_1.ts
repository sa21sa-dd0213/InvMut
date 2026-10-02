import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - Kill mutant m9642a1b2", function () {
  it("should revert when transferring unsupported asset on original contract, but succeed on mutant", async function () {
    const [owner, manager, user] = await ethers.getSigners();
    
    // Deploy LRTConfig mock or use actual implementation
    // For this test, we need a minimal setup with LRTConfig that has MANAGER role
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());
    
    // Grant MANAGER role to manager address
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, manager.address);
    
    // Deploy a dummy ERC20 token that is NOT a supported asset
    const DummyTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const unsupportedAsset = await DummyTokenFactory.deploy("Unsupported", "UNS", 18);
    await unsupportedAsset.waitForDeployment();
    
    // Add a node delegator to the queue (need to do this as admin)
    const nodeDelegatorAddress = user.address; // Using a simple address as placeholder
    await instance.connect(owner).addNodeDelegatorContractToQueue([nodeDelegatorAddress]);
    
    // Mint some tokens to the contract to have balance to transfer
    await unsupportedAsset.mint(await instance.getAddress(), ethers.parseEther("100"));
    
    // Try to transfer unsupported asset to node delegator as manager
    // On original contract this would revert due to onlySupportedAsset modifier
    // On mutant this should succeed
    await expect(
      instance.connect(manager).transferAssetToNodeDelegator(
        0,
        await unsupportedAsset.getAddress(),
        ethers.parseEther("10")
      )
    ).to.not.be.reverted;
    
    // Verify the transfer actually happened on the mutant
    expect(await unsupportedAsset.balanceOf(nodeDelegatorAddress)).to.equal(ethers.parseEther("10"));
  });
});