import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m03d33714 test", function () {
    it("should revert when Collect is called with _am greater than acc.balance (mutant would pass)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const WWalletFactory = await ethers.getContractFactory("W_WALLET");
        const wallet = await WWalletFactory.deploy(await logInstance.getAddress());
        await wallet.waitForDeployment();
        
        // Fund addr1 with 1 ether and call Put to set balance
        const putAmount = ethers.parseEther("1");
        await wallet.connect(addr1).Put(0, { value: putAmount });
        
        // Verify balance is set
        const holder = await wallet.Acc(addr1.address);
        expect(holder.balance).to.equal(putAmount);
        
        // Try to collect 2 ether (more than balance) - should revert in original
        const collectAmount = ethers.parseEther("2");
        await expect(
            wallet.connect(addr1).Collect(collectAmount)
        ).to.be.reverted;
    });
});