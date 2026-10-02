import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when loop iterates out of bounds in mutant (i <= _tos.length)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that implements transferFrom for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve demo contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Setup arrays with exactly one recipient
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("10")];

    // Call transfer with one recipient - should pass on original but fail on mutant
    // because mutant loop goes to i <= 1 (i.e., i=0, i=1) and index 1 is out of bounds
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});