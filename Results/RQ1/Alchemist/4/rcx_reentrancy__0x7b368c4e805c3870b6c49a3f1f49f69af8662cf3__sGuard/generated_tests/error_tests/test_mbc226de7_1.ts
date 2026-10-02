import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant mbc226de7 test", function () {
    it("should detect mutant by checking Collect reverts when balance > MinSum", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();
        
        const MinSum = ethers.parseEther("1");
        const depositAmount = ethers.parseEther("2"); // balance > MinSum
        
        // User deposits 2 ether
        await instance.connect(user).Put(0, { value: depositAmount });
        
        // Wait for block timestamp to advance past unlockTime (0)
        await ethers.provider.send("evm_increaseTime", [1]);
        await ethers.provider.send("evm_mine");
        
        // Try to collect 1 ether (balance 2 >= 1, balance 2 > MinSum 1)
        // Original would succeed, mutant would fail because balance <= MinSum is false
        await expect(
            instance.connect(user).Collect(ethers.parseEther("1"))
        ).to.be.reverted;
    });
});