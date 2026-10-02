import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m88fb2d50 test", function () {
    it("should kill mutant by verifying withdrawal succeeds when user has credit", async function () {
        const [owner, user] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("ReentrancyDAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // User deposits 1 ether
        const depositAmount = ethers.parseEther("1");
        await instance.connect(user).deposit({ value: depositAmount });

        // Get initial balances
        const initialUserBalance = await ethers.provider.getBalance(user.address);
        const initialContractBalance = await ethers.provider.getBalance(instance.getAddress());

        // User calls withdrawAll
        const tx = await instance.connect(user).withdrawAll();
        const receipt = await tx.wait();

        // Get final balances
        const finalUserBalance = await ethers.provider.getBalance(user.address);
        const finalContractBalance = await ethers.provider.getBalance(instance.getAddress());

        // In the original, user should have received the funds
        // In the mutant (condition is false), user receives nothing
        // This assertion will fail on the mutant, killing it
        expect(finalUserBalance).to.be.gt(initialUserBalance);
        expect(finalContractBalance).to.be.lt(initialContractBalance);
    });
});