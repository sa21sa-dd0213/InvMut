import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - getTokenBalance", function () {
  it("should detect mutant that removes return statement in getTokenBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a minimal token that implements balanceOf
    const MinimalTokenFactory = await ethers.getContractFactory("MinimalToken");
    const token = await MinimalTokenFactory.deploy();
    await token.waitForDeployment();

    // Mint some tokens to addr1
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);

    // Call getTokenBalance for addr1's balance of the token
    const balance = await instance.getTokenBalance(await token.getAddress(), addr1.address);

    // The original should return the actual balance (100 ether)
    // The mutant (which removes the return statement) would return 0
    expect(balance).to.equal(mintAmount);
  });
});

// Minimal token contract to support testing
// This needs to be compiled as part of the Hardhat project
contract MinimalToken {
    mapping(address => uint256) public balances;
         
    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }
         
    function mint(address _to, uint256 _amount) public {
        balances[_to] += _amount;
    }
}