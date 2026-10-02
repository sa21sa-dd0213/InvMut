import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transfer is called with valid recipients (mutant loop never executes)", async function () {
    const [owner, from, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing transferFrom
    const Token = await ethers.getContractFactory("ERC20Mock");
    const token = await Token.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: mint tokens to 'from' and approve EBU contract
    const amount = ethers.parseEther("100");
    await token.mint(from.address, amount);
    await token.connect(from).approve(await instance.getAddress(), amount);

    // Prepare transfer call with two recipients
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // This should fail because mutant loop condition i > _tos.length never executes
    await expect(
      instance.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        amounts
      )
    ).to.be.revertedWith(""); // Will revert due to no transfers happening

    // Verify no tokens were transferred
    expect(await token.balanceOf(addr1.address)).to.equal(0);
    expect(await token.balanceOf(addr2.address)).to.equal(0);
  });
});