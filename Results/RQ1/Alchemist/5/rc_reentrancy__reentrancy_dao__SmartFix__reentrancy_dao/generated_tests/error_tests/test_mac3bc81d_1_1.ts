import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant mac3bc81d by verifying withdrawal actually transfers funds and clears credit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check credit is set
    expect(await instance.credit(addr1.address)).to.equal(depositAmount);

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Call withdrawAll
    const tx = await instance.connect(addr1).withdrawAll();
    const receipt = await tx.wait();

    // Check that credit was cleared
    expect(await instance.credit(addr1.address)).to.equal(0);

    // Check that balance decreased (mutant would fail here as no transfer occurs)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.be.gt(initialBalance);

    // Verify gas costs don't account for the difference
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    expect(finalBalance - initialBalance + gasCost).to.equal(depositAmount);
  });
});