import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant test - missing onlySupportedAsset modifier", function () {
    it("should revert when depositing an unsupported asset (mutant kill)", async function () {
        // Deploy LRTDepositPool
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("LRTDepositPool");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a mock ERC20 token (unsupported asset)
        const MockToken = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockToken.deploy("Mock", "MCK", 18);
        await mockToken.waitForDeployment();

        // Deploy LRTConfig (needed for initialization)
        const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
        const lrtConfig = await LRTConfigFactory.deploy();
        await lrtConfig.waitForDeployment();

        // Initialize LRTDepositPool with LRTConfig
        await instance.initialize(await lrtConfig.getAddress());

        // Give addr1 some tokens and approve deposit pool
        const mintAmount = ethers.parseEther("100");
        await mockToken.mint(addr1.address, mintAmount);
        await mockToken.connect(addr1).approve(await instance.getAddress(), mintAmount);

        // Attempt to deposit unsupported asset - should revert with AssetNotSupported
        // In original contract this reverts, in mutant it would not
        await expect(
            instance.connect(addr1).depositAsset(await mockToken.getAddress(), ethers.parseEther("10"))
        ).to.be.revertedWithCustomError(instance, "AssetNotSupported");
    });
});