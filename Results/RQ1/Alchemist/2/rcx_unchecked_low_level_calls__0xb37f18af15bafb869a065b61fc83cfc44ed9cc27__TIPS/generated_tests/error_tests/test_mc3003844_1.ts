import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mc3003844 detection", function () {
  it("should kill the mutant by calling sendMoney with a valid recipient that accepts ether", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so the call has value to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Call sendMoney with a valid recipient (the recipient signer) that can receive ether
    const sendValue = ethers.parseEther("0.5");
    
    // In the original: if the call succeeds (!_s is false), no revert occurs
    // In the mutant: condition is always true, so revert always happens
    // This should revert on the mutant but succeed on the original
    const tx = instance.connect(owner).sendMoney(recipient.address, sendValue);
    
    // The mutant will revert because (true) always triggers the revert
    await expect(tx).to.be.reverted;
  });
});