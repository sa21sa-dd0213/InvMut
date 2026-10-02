import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant med64a1e4 test", function () {
  it("should kill mutant by verifying token transfer with correct selector", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await ERC20Factory.deploy("TestToken", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund the 'from' address with tokens
    await token.transfer(from.address, ethers.parseEther("100"));

    // Deploy the demo contract (no constructor arguments)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();

    // Approve demo contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await demo.getAddress(), ethers.parseEther("50"));

    // Get initial balances
    const initialFromBalance = await token.balanceOf(from.address);
    const initialToBalance = await token.balanceOf(to.address);

    // Call transfer on demo contract
    const tx = await demo.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      [to.address],
      ethers.parseEther("30")
    );
    await tx.wait();

    // Check balances - original uses correct keccak256 selector, mutant uses wrong sha256 selector
    // On original: transfer succeeds, balances change
    // On mutant: wrong selector causes call to fail, balances remain unchanged
    const finalFromBalance = await token.balanceOf(from.address);
    const finalToBalance = await token.balanceOf(to.address);

    // If mutant is deployed, balances will be unchanged (call fails silently or reverts)
    // This assertion will fail on mutant because the transfer didn't happen
    expect(finalFromBalance).to.equal(initialFromBalance - ethers.parseEther("30"));
    expect(finalToBalance).to.equal(initialToBalance + ethers.parseEther("30"));
  });
});