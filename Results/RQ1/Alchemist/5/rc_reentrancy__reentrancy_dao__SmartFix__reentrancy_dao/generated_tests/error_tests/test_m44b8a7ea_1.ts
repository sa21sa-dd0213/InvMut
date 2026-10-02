import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea", function () {
  it("should detect the balance increment mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exactly 1 ETH from addr1
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Check the contract's balance variable (not the ETH balance)
    // In the original, balance should equal depositAmount
    // In the mutant, balance will be depositAmount + 1 wei
    const contractBalance = await instance.balance();
    
    // The original would return exactly depositAmount
    // The mutant would return depositAmount + 1n
    expect(contractBalance).to.equal(depositAmount);
  });
});