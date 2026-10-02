import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6)", function () {
    it("should kill mutant m2b71aeee by verifying addition instead of multiplication in multiplicate", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some initial balance
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("2.0")
        });

        // Record balances before the call
        const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
        const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

        // Call multiplicate with 1 ether
        const tx = await instance.connect(owner).multiplicate(addr1.address, {
            value: ethers.parseEther("1.0")
        });
        await tx.wait();

        // Get balances after the call
        const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
        const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);

        // Expected behavior for ORIGINAL: transfer = contract balance + msg.value = 2 + 1 = 3 ether
        // Mutant would transfer = contract balance * msg.value = 2 * 1 = 2 ether
        const expectedTransfer = ethers.parseEther("3.0");
        const actualTransfer = finalAddr1Balance - initialAddr1Balance;

        // Assert that the actual transfer matches the sum, not the product
        expect(actualTransfer).to.equal(expectedTransfer);
        
        // Also verify contract balance decreased accordingly
        expect(finalContractBalance).to.equal(initialContractBalance - expectedTransfer + ethers.parseEther("1.0"));
    });
});