import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when loop condition is inverted (mutant detection)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to test transfers
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);

    // Prepare recipients array with multiple addresses
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer function
    await expect(
      instance.connect(owner).transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        transferAmount
      )
    ).to.not.be.reverted;

    // Verify tokens were actually transferred (should fail on mutant)
    const addr1Balance = await token.balanceOf(addr1.address);
    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr1Balance).to.equal(transferAmount);
    expect(addr2Balance).to.equal(transferAmount);
  });
});