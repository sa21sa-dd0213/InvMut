import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m16940406 - kill by checking recipient balance", function () {
    it("should send ETH to the hardcoded address 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C when go() is called", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
        const initialBalance = await ethers.provider.getBalance(targetAddress);
        const amount = ethers.parseEther("1.0");

        // Fund the contract first so it has balance to forward
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: amount
        });

        // Call go() which should forward balance to targetAddress
        const tx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
        await tx.wait();

        const finalBalance = await ethers.provider.getBalance(targetAddress);
        // In the original, the target address receives the contract's full balance
        // In the mutant (address(0)), the target address balance does not change
        expect(finalBalance).to.be.greaterThan(initialBalance);
    });
});