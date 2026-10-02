import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test - mb8a8967b", function () {
    it("should detect mutant where balance increases instead of decreases on Collect", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy the Log contract first
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();
        
        // Put 2 ether into the contract from addr1
        const putAmount = ethers.parseEther("2");
        await instance.connect(addr1).Put(0, { value: putAmount });
        
        // Check initial balance
        const initialBalance = (await instance.Acc(addr1.address)).balance;
        expect(initialBalance).to.equal(putAmount);
        
        // Wait for unlock time (Put sets unlockTime to block.timestamp when _unlockTime <= block.timestamp)
        await ethers.provider.send("evm_mine", []);
        
        // Collect 1 ether
        const collectAmount = ethers.parseEther("1");
        await instance.connect(addr1).Collect(collectAmount);
        
        // Check balance after collect - in original it should decrease, in mutant it increases
        const finalBalance = (await instance.Acc(addr1.address)).balance;
        
        // In original: balance = 2 - 1 = 1
        // In mutant: balance = 2 + 1 = 3
        // Assert that balance decreased (original behavior)
        expect(finalBalance).to.equal(ethers.parseEther("1"));
    });
});