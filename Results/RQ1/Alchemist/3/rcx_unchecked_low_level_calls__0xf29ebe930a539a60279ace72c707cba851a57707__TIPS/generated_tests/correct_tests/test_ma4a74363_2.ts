import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant ma4a74363 test", function () {
    it("should kill the mutant by checking the balance of the hardcoded address after go()", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const hardcodedAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";

        // Get initial balance of the hardcoded address
        const initialBalance = await ethers.provider.getBalance(hardcodedAddress);

        // Call go() with some msg.value
        const callValue = ethers.parseEther("1.0");
        const tx = await instance.connect(addr1).go({ value: callValue });
        await tx.wait();

        // Check that the hardcoded address received the ether
        const finalBalance = await ethers.provider.getBalance(hardcodedAddress);
        expect(finalBalance - initialBalance).to.equal(callValue);
    });
});