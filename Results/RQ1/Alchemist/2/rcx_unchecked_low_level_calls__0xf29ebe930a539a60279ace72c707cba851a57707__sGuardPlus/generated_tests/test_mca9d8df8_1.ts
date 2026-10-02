import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mca9d8df8 test", function () {
  it("should detect mutant that changes target to address(this) by verifying owner balance after go() call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");

    // Call go() from addr1 with 1 ETH
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // In the original, the 1 ETH is sent to the external address 0xC8A..., 
    // so owner balance should NOT increase by 1 ETH
    // In the mutant, address(this) call does nothing, so the full balance 
    // gets transferred to owner, increasing owner balance by 1 ETH
    // This assertion should fail on the original (owner balance unchanged) 
    // but pass on the mutant (owner balance increased by 1 ETH)
    expect(finalOwnerBalance).to.equal(initialOwnerBalance + sendAmount);
  });
});