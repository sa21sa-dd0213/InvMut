import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m97fe4d2f test", function () {
  it("should return true on successful transfer (kills mutant that removes return true)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as the caddress target
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: owner approves demo contract to transfer tokens from addr1
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Fund addr1 with tokens
    await token.transfer(addr1.address, ethers.parseEther("100"));

    const tos = [addr2.address];
    const values = [ethers.parseEther("10")];

    // Call transfer and capture the return value
    const tx = await instance.transfer(addr1.address, await token.getAddress(), tos, values);
    const receipt = await tx.wait();

    // The original returns true; mutant returns false (default)
    // We decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256[]) returns (bool)"]);
    const decoded = iface.decodeFunctionResult("transfer", receipt.logs[0].data);
    expect(decoded[0]).to.equal(true);
  });
});