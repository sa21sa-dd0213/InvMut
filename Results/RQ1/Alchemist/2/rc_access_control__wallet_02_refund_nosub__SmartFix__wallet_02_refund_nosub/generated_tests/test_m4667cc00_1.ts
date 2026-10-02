import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - migrateTo access control", function () {
  it("should allow creator to call migrateTo and transfer balance, but mutant reverts for creator", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ETH into the contract first
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Now creator calls migrateTo - should succeed in original, fail in mutant
    await expect(
      instance.connect(owner).migrateTo(addr2.address)
    ).to.not.be.reverted;

    // Verify the balance was transferred to addr2
    const addr2Balance = await ethers.provider.getBalance(addr2.address);
    expect(addr2Balance).to.be.gt(ethers.parseEther("0"));
  });
});