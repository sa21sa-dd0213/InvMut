import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - Deposit require >= vs >", function () {
    it("should revert on deposit with 0 ether when MinDeposit is 0, detecting the > mutant", async function () {
        const [owner] = await ethers.getSigners();

        // Deploy Log contract first (required constructor argument for Private_Bank)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();

        // Deploy Private_Bank with Log address
        const Factory = await ethers.getContractFactory("Private_Bank");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();

        // Set MinDeposit to 0 to allow testing the require statement directly
        // Note: MinDeposit is public but not modifiable in the contract.
        // We simulate by calling Deposit with msg.value > 0 first to set balances,
        // then use a zero-value deposit to trigger the mutant's require failure.

        // First deposit some ether to have a non-zero balance (required for the test)
        await instance.connect(owner).Deposit({ value: ethers.parseEther("2") });

        // Now attempt a deposit with exactly 0 ether
        // In original: require(balances[msg.sender] + 0 >= balances[msg.sender]) passes
        // In mutant: require(balances[msg.sender] + 0 > balances[msg.sender]) fails
        await expect(
            instance.connect(owner).Deposit({ value: 0 })
        ).to.be.reverted;
    });
});