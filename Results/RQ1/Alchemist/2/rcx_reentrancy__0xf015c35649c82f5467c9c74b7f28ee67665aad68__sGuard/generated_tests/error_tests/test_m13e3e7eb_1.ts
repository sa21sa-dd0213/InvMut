import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test", function () {
    it("should revert when balance < MinSum on original, but succeed on mutant", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for MY_BANK)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy MY_BANK with Log address
        const BankFactory = await ethers.getContractFactory("MY_BANK");
        const bank = await BankFactory.deploy(await log.getAddress());
        await bank.waitForDeployment();
        
        // User deposits 0.5 ether (less than MinSum which is 1 ether)
        const depositAmount = ethers.parseEther("0.5");
        await bank.connect(user).Put(0, { value: depositAmount });
        
        // Advance time past unlockTime (Put sets unlockTime to block.timestamp if _unlockTime <= block.timestamp)
        await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
        await ethers.provider.send("evm_mine", []);
        
        // User tries to collect 0.5 ether (their full balance)
        // On original: should revert because acc.balance (0.5) < MinSum (1.0)
        // On mutant: should succeed because (acc.balance >= _am && block.timestamp > acc.unlockTime) is true
        const collectTx = bank.connect(user).Collect(depositAmount);
        
        // This test expects the transaction to revert (original behavior)
        // The mutant would pass this transaction, thus the test would fail on the mutant
        await expect(collectTx).to.be.reverted;
    });
});