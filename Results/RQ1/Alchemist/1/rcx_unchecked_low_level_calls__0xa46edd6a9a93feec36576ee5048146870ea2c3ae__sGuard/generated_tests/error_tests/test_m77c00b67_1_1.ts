import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is called with valid parameters; mutant that removes return true will return false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use for the transfer test
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to owner and approve the EBU contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(instance.target, ethers.parseEther("100"));

    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Call transfer and check the return value is true
    const tx = await instance.transfer(owner.address, token.target, recipients, amounts);
    await tx.wait();

    // The function returns a bool; we capture it via the transaction result
    // In ethers v6, we need to decode the return value from the function call
    const result = await instance.transfer.staticCall(owner.address, token.target, recipients, amounts);
    expect(result).to.equal(true);
  });
});