import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - Put function arithmetic change", function () {
    it("should revert when calling Put with 0 value after having a positive balance, killing the mutant", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required by X_WALLET constructor)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();

        // Deploy X_WALLET with Log address
        const Factory = await ethers.getContractFactory("X_WALLET");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();

        // First, have addr1 send some ether to create a positive balance
        const putTx1 = await instance.connect(addr1).Put(
            Math.floor(Date.now() / 1000) + 3600, // unlock time 1 hour from now
            { value: ethers.parseEther("1.0") }
        );
        await putTx1.wait();

        // Verify balance is now positive
        const holder = await instance.Acc(addr1.address);
        expect(holder.balance).to.equal(ethers.parseEther("1.0"));

        // Now call Put with 0 value - this should pass in original (balance + 0 >= balance)
        // but should revert in mutant (balance * 0 >= balance fails for positive balance)
        const putTx2 = instance.connect(addr1).Put(
            Math.floor(Date.now() / 1000) + 3600,
            { value: 0 }
        );

        // This transaction should revert in the mutant, killing it
        await expect(putTx2).to.be.reverted;
    });
});