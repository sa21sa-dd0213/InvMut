import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m8d6bd7d3 test", function () {
    it("should send ETH to the external address, not to the contract itself", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethert.getContractFactory("B");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Get the hardcoded external address from the original contract
        const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";

        // Fund the contract with some ETH first via fallback
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("1.0")
        });

        // Capture balance of external address before calling go
        const externalBalanceBefore = await ethers.provider.getBalance(externalAddress);
        const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);

        // Call go with 0.5 ETH
        const tx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
        await tx.wait();

        // Check that external address received the ETH (original behavior)
        const externalBalanceAfter = await ethers.provider.getBalance(externalAddress);
        const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);

        // Original: external address gets the 0.5 ETH, contract balance goes to owner
        // Mutant: contract calls itself, so external address gets nothing
        expect(externalBalanceAfter - externalBalanceBefore).to.equal(ethers.parseEther("0.5"));
    });
});