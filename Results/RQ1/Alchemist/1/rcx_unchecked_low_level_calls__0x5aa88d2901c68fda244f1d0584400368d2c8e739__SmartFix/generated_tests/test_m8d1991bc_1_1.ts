import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m8d1991bc", function () {
    it("should transfer contract balance + msg.value when msg.value >= contract balance", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        const initialContractBalance = ethers.parseEther("10");
        const ownerSigner = await ethers.getImpersonatedSigner(owner.address);
        
        // Fund the contract with 10 ETH
        await ownerSigner.sendTransaction({
            to: await instance.getAddress(),
            value: initialContractBalance
        });
        
        // Get initial balance of addr1
        const addr1InitialBalance = await ethers.provider.getBalance(addr1.address);
        
        // Send 10 ETH (>= contract balance) via multiplicate
        const sendValue = ethers.parseEther("10");
        await instance.connect(owner).multiplicate(addr1.address, { value: sendValue });
        
        // Expected: addr1 receives contract balance (10 ETH) + sent value (10 ETH) = 20 ETH
        const addr1FinalBalance = await ethers.provider.getBalance(addr1.address);
        const expectedTransfer = ethers.parseEther("20");
        
        expect(addr1FinalBalance - addr1InitialBalance).to.equal(expectedTransfer);
    });
});