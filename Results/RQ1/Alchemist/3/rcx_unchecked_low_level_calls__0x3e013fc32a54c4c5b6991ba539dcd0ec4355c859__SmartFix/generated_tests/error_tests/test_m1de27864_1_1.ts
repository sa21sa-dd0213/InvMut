import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
    it("should kill mutant m1de27864 by sending a positive msg.value that passes the outer if condition", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const contractAddress = await instance.getAddress();

        // Fund the contract with some initial balance
        await owner.sendTransaction({
            to: contractAddress,
            value: ethers.parseEther("1.0")
        });

        // Get initial balances
        const initialContractBalance = await ethers.provider.getBalance(contractAddress);
        const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

        // Calculate msg.value to satisfy: msg.value >= address(this).balance
        // Send exactly the current balance so the if condition passes
        const msgValue = initialContractBalance;

        // This transaction should succeed in the original contract (no revert)
        // but the mutant will revert because msg.value > 0 fails the mutated require
        await expect(
            instance.connect(owner).multiplicate(addr1.address, { value: msgValue })
        ).to.not.be.reverted;

        // Verify the transfer happened (original behavior)
        const finalContractBalance = await ethers.provider.getBalance(contractAddress);
        const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);

        // The contract should have sent all balance (initial + msg.value) to addr1
        // In the original, contract ends with 0 balance (or close to 0 due to gas)
        // In the mutant, the tx would revert, so this assertion would fail
        expect(finalContractBalance).to.equal(0);
        expect(finalAddr1Balance).to.equal(initialAddr1Balance + initialContractBalance + msgValue);
    });
});