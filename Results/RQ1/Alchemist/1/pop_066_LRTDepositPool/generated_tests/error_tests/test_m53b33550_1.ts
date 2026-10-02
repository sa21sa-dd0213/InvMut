import { expect } from "chai";
import { ethers } } from "hardhat";

describe("LRTDepositPool mutant kill test", function () {
    it("should revert when transferAssetToNodeDelegator fails due to insufficient balance", async function () {
        const [owner, manager, nodeDelegator, user] = await ethers.getSigners();
        
        // Deploy mock ERC20 token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Test", "TST", 18);
        await mockToken.waitForDeployment();
        
        // Deploy LRTConfig mock
        const LRTConfig = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfig.deploy();
        await lrtConfig.waitForDeployment();
        
        // Setup roles and supported assets
        const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
        const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
        
        await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
        await lrtConfig.grantRole(MANAGER_ROLE, manager.address);
        
        // Add test token as supported asset
        await lrtConfig.addNewSupportedAsset(mockToken.target, ethers.parseEther("1000000"));
        
        // Deploy LRTDepositPool
        const LRTDepositPool = await ethers.getContractFactory("LRTDepositPool");
        const depositPool = await LRTDepositPool.deploy();
        await depositPool.waitForDeployment();
        
        // Initialize
        await depositPool.initialize(lrtConfig.target);
        
        // Add node delegator
        await depositPool.addNodeDelegatorContractToQueue([nodeDelegator.address]);
        
        // Try to transfer more tokens than the pool has (pool has 0 tokens)
        await expect(
            depositPool.connect(manager).transferAssetToNodeDelegator(
                0,
                mockToken.target,
                ethers.parseEther("100")
            )
        ).to.be.reverted;
    });
});