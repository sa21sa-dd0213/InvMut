import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test m43b1cf64", function () {
  it("should detect the msg.value+1 mutation in deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits exactly 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });
    
    // In original contract, balance would be exactly 1 ETH
    // In mutant, balance would be 1 ETH + 1 wei due to msg.value+1
    // User tries to withdraw exactly 1 ETH - should succeed in both
    await instance.connect(user).withdraw(depositAmount);
    
    // Now check contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original: contract balance should be 0 (all withdrawn)
    // In mutant: contract balance should be 1 wei (the extra wei remains)
    expect(contractBalance).to.equal(0);
  });
});