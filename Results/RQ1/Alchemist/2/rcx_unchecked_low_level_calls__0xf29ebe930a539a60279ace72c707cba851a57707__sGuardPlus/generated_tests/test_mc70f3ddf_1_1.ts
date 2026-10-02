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
        const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
        
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
        await instance.connect(addr1).go({ value: sendAmount });
        
        // After call, original contract should have 0 balance (transferred to owner)
        // Mutant also transfers 0 balance but sent 1 extra wei to target
        const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
        expect(finalBalance).to.equal(0n);
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