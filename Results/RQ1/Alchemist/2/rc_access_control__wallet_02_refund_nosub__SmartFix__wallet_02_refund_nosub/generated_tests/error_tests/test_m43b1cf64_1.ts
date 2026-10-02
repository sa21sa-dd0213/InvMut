import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m43b1cf64", function () {
  it("should detect the mutant that adds 1 extra wei to deposit balances", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // Perform a deposit of exactly 1 ether from addr1
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Check the balance of addr1 in the contract
    // The original contract should show exactly depositAmount
    // The mutant (with msg.value+1) would show depositAmount + 1 wei
    const balance = await instance.balances(addr1.address);
    
    // This assertion will pass on the original but fail on the mutant
    expect(balance).to.equal(depositAmount);
  });
});