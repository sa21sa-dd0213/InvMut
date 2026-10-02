import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when a transferFrom call fails inside the loop (detects removal of revert())", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(await instance.getAddress(), mintAmount);

    // Setup: addr1 allows EBU to transferFrom, but we'll make the second transfer fail
    const recipients = [addr2.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("200")]; // second amount exceeds allowance

    // Expect revert because the second transferFrom call should fail
    await expect(
      instance.transfer(addr1.address, await token.getAddress(), recipients, amounts)
    ).to.be.reverted;

    // Verify state: first transfer should not have gone through either (full revert)
    expect(await token.balanceOf(addr2.address)).to.equal(0);
  });
});