import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m68e0927f test", function () {
    it("should detect mutant that changes && to || in Collect function", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required by W_WALLET constructor)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();
        
        // Fund user with exactly MinSum (1 ether)
        const minSum = ethers.parseEther("1");
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: minSum
        });
        
        // Transfer ownership of the funded balance to user via fallback
        await user.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1")
        });
        
        // Now user has balance = 1 ether = MinSum
        // Try to collect 2 ether (more than balance)
        // Original contract would revert because acc.balance >= _am is false
        // Mutant would succeed because acc.balance >= MinSum is true (first condition with ||)
        await expect(
            instance.connect(user).Collect(ethers.parseEther("2"))
        ).to.be.reverted;
    });
});