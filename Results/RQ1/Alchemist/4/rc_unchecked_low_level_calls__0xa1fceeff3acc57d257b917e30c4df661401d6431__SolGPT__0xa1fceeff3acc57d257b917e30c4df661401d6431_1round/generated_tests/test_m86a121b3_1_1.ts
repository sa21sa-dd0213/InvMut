import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m86a121b3", function () {
  it("should revert when calling transfer with a valid non-zero contract_address due to mutant's incorrect zero-address check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as the contract_address
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Create arrays for airdrop
    const tos = [await addr1.getAddress()];
    const vs = [ethers.parseEther("10")];

    // In the original contract, this call would succeed because contract_address is non-zero.
    // In the mutant, require(addr == address(0x0)) will cause revert for any non-zero address.
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});