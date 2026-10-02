import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection - deposit credit mismatch", function () {
  it("should detect mutant that subtracts 1 wei from deposited credit", async function () {
    const [owner, user] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits exactly 1 ETH
    const tx = await instance.connect(user).deposit({ value: depositAmount });
    await tx.wait();
    
    // Check credit stored in mapping - should equal depositAmount
    const userCredit = await instance.credit(user.address);
    
    // On original contract: userCredit == depositAmount
    // On mutant: userCredit == depositAmount - 1 wei
    expect(userCredit).to.equal(depositAmount);
  });
});