import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m6bb5652f", function () {
  it("should kill the mutant by sending two deposits, where the second deposit reverts due to subtraction bug", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit: should succeed (depositsCount goes from 0 to 1)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Verify depositsCount is now 1
    expect(await instance.depositsCount()).to.equal(1);

    // Second deposit: on the mutant, require((depositsCount - 1) >= depositsCount) 
    // becomes require(0 >= 1) which is false, causing revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});