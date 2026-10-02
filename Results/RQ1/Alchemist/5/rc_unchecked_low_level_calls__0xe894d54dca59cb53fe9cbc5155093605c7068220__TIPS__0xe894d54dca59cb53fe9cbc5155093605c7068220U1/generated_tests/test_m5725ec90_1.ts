import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5725ec90 - return true removal", function () {
  it("should kill the mutant by asserting the function returns true on success", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that has transferFrom
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' and approve the airDrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    const recipients = [recipient.address];
    const transferAmount = ethers.parseEther("10");
    const decimals = 18;

    // Call the transfer function and check the return value
    const tx = await instance.transfer(
      from.address,
      await token.getAddress(),
      recipients,
      transferAmount,
      decimals
    );
    const receipt = await tx.wait();

    // The original returns true, the mutant returns false - this assertion kills the mutant
    expect(tx).to.emit(instance, "Transfer"); // This line is not needed but kept for reference
    // Actually check the return value directly using static call or by reading the tx result
    const returnValue = await instance.transfer.staticCall(
      from.address,
      await token.getAddress(),
      recipients,
      transferAmount,
      decimals
    );
    expect(returnValue).to.equal(true);
  });
});