import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m3474fafc", function () {
    it("should transfer full contract balance plus sent ether when msg.value >= contract balance", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const contractAddress = await instance.getAddress();

        // Fund the contract with some initial balance
        const initialBalance = ethers.parseEther("10");
        await owner.sendTransaction({
            to: contractAddress,
            value: initialBalance
        });

        // Verify initial contract balance
        expect(await ethers.provider.getBalance(contractAddress)).to.equal(initialBalance);

        // addr1 sends msg.value >= contract balance (10 ETH + some extra)
        const sentAmount = ethers.parseEther("15");
        const expectedTransfer = initialBalance + sentAmount;

        // Record addr2's balance before transfer
        const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

        // Call multiplicate with addr2 as recipient and sentAmount
        const tx = await instance.connect(addr1).multiplicate(addr2.address, { value: sentAmount });
        await tx.wait();

        // Check that addr2 received the expected amount (full contract balance + sent ether)
        const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);
        expect(addr2BalanceAfter - addr2BalanceBefore).to.equal(expectedTransfer);

        // Contract balance should be zero after transfer
        expect(await ethers.provider.getBalance(contractAddress)).to.equal(0);
    });
});