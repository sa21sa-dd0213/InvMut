import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m9bc0c217 test", function () {
    it("should detect the msg.value-1 mutation by checking contract balance after go() call", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        const contractAddress = await instance.getAddress();
        
        // Send exactly 2 wei to the go() function
        const tx = await instance.connect(addr1).go({ value: 2 });
        await tx.wait();
        
        // In the original, contract balance should be 0 after go()
        // In the mutant, 1 wei remains because msg.value-1 sends only 1 wei to target
        const contractBalance = await ethers.provider.getBalance(contractAddress);
        expect(contractBalance).to.equal(0);
    });
});