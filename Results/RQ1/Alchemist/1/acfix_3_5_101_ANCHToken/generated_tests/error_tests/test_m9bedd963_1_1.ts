import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - m9bedd963", function () {
  it("should revert when transferring to zero address (mutant removed require)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with a mock router address and a mock USD token address
    // Since the contract constructor requires a router and USD token, we use dummy addresses
    const mockRouter = "0x0000000000000000000000000000000000000001";
    const mockUSDToken = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();

    // Get some tokens to transfer by calling a method that adds balance
    // The constructor mints all tokens to the owner, so we use owner's balance
    const zeroAddress = ethers.ZeroAddress;

    // Attempt to transfer from owner to zero address - should revert in original
    await expect(
      instance.transfer(zeroAddress, ethers.parseEther("100"))
    ).to.be.revertedWith("ERC20: transfer to the zero address");
  });
});