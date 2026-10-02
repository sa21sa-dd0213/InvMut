import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8c179396 - loop condition change", function () {
  it("should revert when loop condition is changed from < to > (mutant kills loop execution)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token that can be used for transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the demo contract to spend them
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("50"));

    // Prepare test data
    const recipients = [addr2.address];
    const amounts = [ethers.parseEther("10")];

    // In the original contract, this call would succeed (loop runs once)
    // In the mutant, the loop never runs (i > _tos.length is false), so no transferFrom call is made
    // This means no tokens are transferred, which would be detectable by checking balances
    const tx = await instance.connect(addr1).transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();

    // Check that the transfer actually happened (original behavior)
    // If mutant, no transfer occurred, so addr2 balance remains 0
    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(ethers.parseEther("10"));
  });
});