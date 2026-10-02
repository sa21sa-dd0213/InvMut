import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m9cfb03ab", function () {
  it("should revert when contract_address is the contract itself (kills mutant that removes validAddress modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the contract_address for the transfer
    const TokenFactory = await ethers.getContractFactory("ERC20Token");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Test: passing the AirDropContract's own address as contract_address
    // Original contract would revert due to validAddress modifier checking addr != address(this)
    // Mutant removes this check, so the transaction would NOT revert, and this test should fail on the mutant
    await expect(
      instance.transfer(
        await instance.getAddress(),
        [await addr1.getAddress()],
        [ethers.parseEther("10")]
      )
    ).to.be.reverted;
  });
});