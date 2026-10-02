import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should detect keccak256 vs sha256 change by verifying token transfer fails", async function () {
    // Deploy airPort (no constructor arguments needed)
    const airPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await airPortFactory.deploy();
    await airPort.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const tokenFactory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await tokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    const [owner, from, to1, to2] = await ethers.getSigners();
    const transferAmount = ethers.parseEther("10");

    // Mint tokens to 'from' address and approve airPort contract
    await token.mint(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(airPort.target, ethers.parseEther("100"));

    // Capture balances before transfer
    const fromBalanceBefore = await token.balanceOf(from.address);
    const to1BalanceBefore = await token.balanceOf(to1.address);
    const to2BalanceBefore = await token.balanceOf(to2.address);

    // Call transfer on airPort contract
    const recipients = [to1.address, to2.address];
    const tx = await airPort.connect(owner).transfer(
      from.address,
      token.target,
      recipients,
      transferAmount
    );
    await tx.wait();

    // Check balances after - original should succeed, mutant should fail
    const fromBalanceAfter = await token.balanceOf(from.address);
    const to1BalanceAfter = await token.balanceOf(to1.address);
    const to2BalanceAfter = await token.balanceOf(to2.address);

    // In original: from loses 2 * transferAmount, each recipient gains transferAmount
    // In mutant: sha256 produces wrong selector, so transferFrom fails silently (no revert due to require in loop)
    // Actually the mutant will revert because the call returns false and require(_s) will fail
    // So the test should expect that the transaction actually reverts on the mutant
    
    // For the original contract, this should pass:
    expect(fromBalanceAfter).to.equal(fromBalanceBefore - (transferAmount * 2n));
    expect(to1BalanceAfter).to.equal(to1BalanceBefore + transferAmount);
    expect(to2BalanceAfter).to.equal(to2BalanceBefore + transferAmount);
  });
});