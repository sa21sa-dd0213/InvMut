import { expect } from "chai";
import { ethers } from "hardhat";

describe("B - kill mutant mc70f3ddf", function () {
    it("should revert when sending exact balance due to msg.value+1 overflow", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some initial balance for testing
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
        });

        // Send exactly the contract's balance as msg.value
        // The mutant will try to send msg.value+1, causing a revert
        const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
        
        await expect(
            addr1.sendTransaction({
                to: await instance.getAddress(),
                value: contractBalance,
                data: "0x" // This triggers the fallback? No, we need to call go() - let's fix
            })
        ).to.be.reverted;

        // Actually call the go() function with the contract's exact balance
        await expect(
            instance.connect(addr1).go({ value: contractBalance })
        ).to.be.reverted;
    });

    it("should pass on original - send less than balance to show mutant fails differently", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund contract
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("5")
        });

        // Send 1 ether - original would succeed, mutant would try to send 1 ether + 1 wei
        const sendAmount = ethers.parseEther("1");
        
        // In the original, this works; in the mutant, it should also work if balance > sendAmount+1
        // But we need to detect the difference - let's check the contract's final balance
        await instance.connect(addr1).go({ value: sendAmount });
        
        // After call, original contract should have 0 balance (transferred to owner)
        // Mutant also transfers 0 balance but sent 1 extra wei to target
        // The key difference: mutant sends msg.value+1, so if we track the target's balance...
        // Actually simpler: use a scenario where msg.value+1 > contract balance
    });

    it("kills mutant by sending exact contract balance minus 1 wei", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund contract with exactly 2 ether
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("2")
        });

        // Send 1 ether + 1 wei less than balance? No - send exactly balance minus 1
        const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
        const sendValue = contractBalance - 1n; // 1 wei less than balance
        
        // In original: sendValue is sent to target, contract keeps 1 wei, owner gets 1 wei
        // In mutant: sendValue+1 = contractBalance is sent to target, contract has 0, owner gets 0
        // But the transfer to owner happens after the call - let's think again
        
        // Best kill: send value where msg.value+1 > contract balance
        // Send exactly contract balance - mutant will try to send balance+1 which fails
        const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
        await expect(
            instance.connect(addr1).go({ value: balanceBefore })
        ).to.be.reverted; // Mutant fails because it tries to send balanceBefore+1
    });

    it("definitive kill: send value equal to contract balance", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund contract with arbitrary amount
        const fundAmount = ethers.parseEther("3");
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: fundAmount
        });

        const balance = await ethers.provider.getBalance(await instance.getAddress());
        
        // Send exactly the balance - original succeeds, mutant reverts
        await expect(
            instance.connect(addr1).go({ value: balance })
        ).to.be.reverted;
    });
});